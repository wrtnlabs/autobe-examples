import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_request_retrieve_finalized_decision(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output = await api.functional.mallPlatform.seller.approval_requests.at(
    sellerConnection,
    {
      approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "approval request has an identifier",
    output.id.length > 0,
  );
  TestValidator.predicate(
    "approval request includes applicant administrator summary",
    output.administrator !== null,
  );
  TestValidator.predicate(
    "approval request stores a review status",
    output.status.length > 0,
  );
  TestValidator.equals(
    "pending requests have no reviewer administrator",
    output.status === "pending" ? output.reviewerAdministrator : null,
    output.status === "pending" ? null : output.reviewerAdministrator,
  );
  TestValidator.equals(
    "reviewed timestamps align with review state",
    output.reviewerAdministrator === null
      ? output.reviewedAt
      : output.reviewedAt,
    output.reviewedAt,
  );
}
