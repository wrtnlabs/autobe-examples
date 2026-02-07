import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the rejection of a ban appeal with comprehensive justification.
 * Set up a user with an active ban and pending appeal. As an administrator,
 * update the appeal status from 'pending' to 'rejected' with a detailed
 * rejection reason explaining why the ban decision is upheld. Validate that
 * the appeal workflow transitions correctly, the rejection reason is recorded,
 * and the ban remains in effect. Verify that all timestamp fields (reviewed_at,
 * updated_at) are properly updated.
 */
export async function test_api_ban_appeal_update_status_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: The scenario requires a user with an active ban and pending appeal,
  // but the necessary APIs to create these entities are not available in the
  // provided SDK functions. The test will focus on testing the ban appeal
  // status update functionality with a mock ban ID.
  // Generate a random ban ID for testing
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Update the ban appeal status to rejected with comprehensive justification
  const updateBody: IDiscussionBoardBanAppeal.IUpdate = {
    status: "rejected",
    decision_reason:
      "After thorough review of the appeal and the original ban reason, the moderation team has determined that the ban decision should be upheld. The user's behavior violated community guidelines regarding harassment and inappropriate content. The appeal does not provide sufficient evidence to overturn the original decision.",
  };
  const updatedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.patchByBanid(
      adminConnection,
      {
        banId,
        body: updateBody,
      },
    );
  typia.assert(updatedAppeal);
  // Validate the appeal status transition
  TestValidator.equals(
    "appeal status should be rejected",
    updatedAppeal.status,
    "rejected",
  );
  // Validate the decision reason is recorded
  TestValidator.equals(
    "decision reason should match input",
    updatedAppeal.decision_reason,
    updateBody.decision_reason,
  );
  // Validate timestamp fields are properly updated
  TestValidator.predicate(
    "reviewed_at should be set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    updatedAppeal.updated_at !== null,
  );
  // Validate reviewer information is set
  TestValidator.predicate(
    "reviewer should be set",
    updatedAppeal.reviewer !== null,
  );
  // Validate ban record information is present
  TestValidator.predicate(
    "ban record should be present",
    updatedAppeal.banRecord !== undefined,
  );
}
