import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_admin_read_consistent_state(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Admin authorization context via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphabets(12),
  } satisfies IShoppingMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Helper to read and validate a cancellation request
  const readAndValidate = async (
    id: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCancellationRequest> => {
    const response =
      await api.functional.shoppingMall.admin.admin.cancellation_requests.at(
        adminConnection,
        { cancellationRequestId: id },
      );
    typia.assert(response);
    TestValidator.equals(
      "orderItem.id matches shoppingMallOrderItemId",
      response.orderItem.id,
      response.shoppingMallOrderItemId,
    );
    if (response.sellerDecisionedAt === null) {
      TestValidator.equals(
        "sellerResponseReason is null when sellerDecisionedAt is null",
        response.sellerResponseReason,
        null,
      );
    }
    return response;
  };
  // 2) Find an existing targetable cancellation request by probing UUIDs.
  // Because no listing/generation utilities are provided for cancellation requests,
  // probing is the only way to satisfy the "exists" precondition.
  const decidedResults: IShoppingMallCancellationRequest[] = [];
  const undecidedResults: IShoppingMallCancellationRequest[] = [];
  // Probe up to N candidates to try to collect both decided/undecided.
  const probeCount = 20;
  for (let i = 0; i < probeCount; i++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const firstRead = await readAndValidate(candidateId);
      // Read-after-read consistency check
      const secondRead = await readAndValidate(candidateId);
      TestValidator.equals("id stable", secondRead.id, firstRead.id);
      TestValidator.equals(
        "shoppingMallOrderItemId stable",
        secondRead.shoppingMallOrderItemId,
        firstRead.shoppingMallOrderItemId,
      );
      TestValidator.equals(
        "reason stable",
        secondRead.reason,
        firstRead.reason,
      );
      TestValidator.equals(
        "requestedAt stable",
        secondRead.requestedAt,
        firstRead.requestedAt,
      );
      TestValidator.equals(
        "status stable",
        secondRead.status,
        firstRead.status,
      );
      TestValidator.equals(
        "sellerDecisionedAt stable",
        secondRead.sellerDecisionedAt,
        firstRead.sellerDecisionedAt,
      );
      TestValidator.equals(
        "sellerResponseReason stable",
        secondRead.sellerResponseReason,
        firstRead.sellerResponseReason,
      );
      TestValidator.equals(
        "createdAt stable",
        secondRead.createdAt,
        firstRead.createdAt,
      );
      TestValidator.equals(
        "updatedAt stable",
        secondRead.updatedAt,
        firstRead.updatedAt,
      );
      TestValidator.equals(
        "deletedAt stable",
        secondRead.deletedAt,
        firstRead.deletedAt,
      );
      TestValidator.equals(
        "orderItem summary stable",
        secondRead.orderItem,
        firstRead.orderItem,
      );
      if (firstRead.sellerDecisionedAt === null) {
        undecidedResults.push(firstRead);
      } else {
        decidedResults.push(firstRead);
      }
      // Stop early if we collected both types
      if (decidedResults.length >= 1 && undecidedResults.length >= 1) {
        break;
      }
    } catch {
      // Ignore failures and continue probing
    }
  }
  // At minimum, we must have found one existing request.
  const found = decidedResults.length + undecidedResults.length;
  TestValidator.predicate(
    "should find at least one existing cancellation request",
    found > 0,
  );
}
