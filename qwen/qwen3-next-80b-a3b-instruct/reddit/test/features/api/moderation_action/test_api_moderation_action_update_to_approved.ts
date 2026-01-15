import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActions";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportMetadata";
import { prepare_random_community_platform_moderation_action } from "../../../prepare/prepare_random_community_platform_moderation_action";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { generate_random_community_platform_admin_reports_create } from "../../../generate/generate_random_community_platform_admin_reports_create";
import { generate_random_community_platform_admin_moderation_actions_create } from "../../../generate/generate_random_community_platform_admin_moderation_actions_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_action_update_to_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // adminConnection.headers now contains the authorization token
  // Generate a valid UUID for the moderation action ID
  const actionId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Update moderation action to approved status with administrative notes
  const updatedAction: ICommunityPlatformModerationActions =
    await api.functional.communityPlatform.admin.moderation.actions.update(
      adminConnection,
      {
        actionId: actionId,
        body: {
          status: "approved",
          notes:
            "Content reviewed and approved by admin after inspection of evidence.",
        } satisfies ICommunityPlatformModerationActions.IUpdate,
      },
    );
  typia.assert(updatedAction);
  // Step 3: Validate the update was successful
  TestValidator.equals(
    "moderation action status updated to approved",
    updatedAction.status,
    "approved",
  );
  TestValidator.equals(
    "administrative notes were recorded",
    updatedAction.notes,
    "Content reviewed and approved by admin after inspection of evidence.",
  );
}
