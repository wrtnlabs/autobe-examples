import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_promotion_request_review_detailed_view(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  // Update the connection with authentication token
  superAdminConnection.headers = {
    Authorization: authorizedSuperAdmin.token.access,
  };
  // Generate a realistic promotion request ID for testing
  const promotionRequestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve promotion request details as super administrator
  const promotionRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.at(
      superAdminConnection,
      {
        requestId: promotionRequestId,
      },
    );
  typia.assert(promotionRequest);
  // The typia.assert() above performs complete validation of all properties
  // including type checks, format validations, and constraint validations
  // No additional manual validation is needed or allowed after typia.assert()
  // We can only test business logic aspects after typia.assert()
  TestValidator.equals(
    "request ID matches input",
    promotionRequest.id,
    promotionRequestId,
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(promotionRequest.status),
  );
  // Validate mutual exclusivity of approval and rejection timestamps
  TestValidator.predicate(
    "approved and rejected timestamps are mutually exclusive",
    !(
      promotionRequest.approved_at !== null &&
      promotionRequest.rejected_at !== null
    ),
  );
}
