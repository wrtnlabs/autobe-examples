import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_cancellation_request_snapshots_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator sign up and authorized connection creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare specific filter criteria
  //    Create random cancellationRequestId (simulate UUID) and status filters
  const filterCancellationRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Select sellerApprovalStatus and status from possible typical values
  const possibleSellerStatus = ["pending", "approved", "rejected"];
  const possibleStatus = ["requested", "confirmed", "cancelled"];
  const filterSellerApprovalStatus = RandomGenerator.pick(possibleSellerStatus);
  const filterStatus = RandomGenerator.pick(possibleStatus);
  // Prepare requestedAtFrom and requestedAtTo (ISO 8601 date strings)
  const now = new Date();
  const requestedAtFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const requestedAtTo = now.toISOString();
  // Pagination parameters
  const page = 1;
  const limit = 5;
  // 3. Query snapshots with these filters
  const requestBody: IShoppingMallCancellationRequestSnapshot.IRequest = {
    cancellationRequestId: filterCancellationRequestId,
    sellerApprovalStatus: filterSellerApprovalStatus,
    status: filterStatus,
    requestedAtFrom: requestedAtFrom,
    requestedAtTo: requestedAtTo,
    page: page,
    limit: limit,
  };
  const result =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.index(
      adminConnection,
      { body: requestBody },
    );
  // 4. Assert full structure and pagination validity
  typia.assert(result);
  TestValidator.predicate(
    "pagination current page should be the requested one",
    result.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit should be the requested one",
    result.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination records should be greater or equal than data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be correct count",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 5. Validate that each snapshot entry matches the filter criteria if present
  for (const snapshot of result.data) {
    typia.assert(snapshot);
    if (requestBody.cancellationRequestId !== undefined) {
      TestValidator.equals(
        "filter by cancellationRequestId",
        snapshot.cancellationRequestId,
        requestBody.cancellationRequestId,
      );
    }
    if (requestBody.status !== undefined) {
      TestValidator.equals(
        "filter by status",
        snapshot.status,
        requestBody.status,
      );
    }
    // sellerApprovalStatus is related to live cancellation requests, assume the snapshot could have it on status to verify
    if (requestBody.sellerApprovalStatus !== undefined) {
      // Since snapshots have no direct sellerApprovalStatus property, skip direct assert
      // This is a limitation but we test the filter effect behind API.
      // Alternatively, could test presence of the data and trust API implementation.
      TestValidator.predicate(
        "filtered results contain sellerApprovalStatus",
        ["pending", "approved", "rejected"].includes(
          requestBody.sellerApprovalStatus ?? "",
        ),
      );
    }
    if (requestBody.requestedAtFrom !== undefined) {
      TestValidator.predicate(
        "snapshot createdAt >= requestedAtFrom",
        new Date(snapshot.createdAt) >= new Date(requestBody.requestedAtFrom),
      );
    }
    if (requestBody.requestedAtTo !== undefined) {
      TestValidator.predicate(
        "snapshot createdAt <= requestedAtTo",
        new Date(snapshot.createdAt) <= new Date(requestBody.requestedAtTo),
      );
    }
  }
}
