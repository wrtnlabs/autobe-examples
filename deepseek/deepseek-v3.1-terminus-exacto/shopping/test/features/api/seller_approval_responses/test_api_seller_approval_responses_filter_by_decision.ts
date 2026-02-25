import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerApprovalResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_responses_filter_by_decision(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator authentication connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create administrator account
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password"> as string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // Test filtering by 'approved' decision
  const approvedResponse =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          decision: "approved" as const,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate approved responses only contain approved decisions
  TestValidator.predicate(
    "approved response data structure valid",
    Array.isArray(approvedResponse.data),
  );
  if (approvedResponse.data.length > 0) {
    TestValidator.predicate(
      "all approved response items have approved decision",
      approvedResponse.data.every((item) => item.decision === "approved"),
    );
  }
  // Validate approved response pagination
  TestValidator.equals(
    "approved response has pagination metadata",
    typeof approvedResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "approved pagination fields are valid",
    approvedResponse.pagination.current >= 1 &&
      approvedResponse.pagination.limit > 0 &&
      approvedResponse.pagination.records >= 0 &&
      approvedResponse.pagination.pages >= 0,
  );
  // Test filtering by 'rejected' decision
  const rejectedResponse =
    await api.functional.ecommerce.administrator.seller_approval_responses.index(
      adminConnection,
      {
        body: {
          decision: "rejected" as const,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IEcommerceSellerApprovalResponse.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate rejected responses only contain rejected decisions
  TestValidator.predicate(
    "rejected response data structure valid",
    Array.isArray(rejectedResponse.data),
  );
  if (rejectedResponse.data.length > 0) {
    TestValidator.predicate(
      "all rejected response items have rejected decision",
      rejectedResponse.data.every((item) => item.decision === "rejected"),
    );
  }
  // Validate rejected response pagination
  TestValidator.equals(
    "rejected response has pagination metadata",
    typeof rejectedResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "rejected pagination fields are valid",
    rejectedResponse.pagination.current >= 1 &&
      rejectedResponse.pagination.limit > 0 &&
      rejectedResponse.pagination.records >= 0 &&
      rejectedResponse.pagination.pages >= 0,
  );
}
