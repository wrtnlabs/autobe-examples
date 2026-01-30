import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommentModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentModerationAction";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { prepare_random_community_bbs_comment_moderation_action } from "../../../prepare/prepare_random_community_bbs_comment_moderation_action";
import { generate_random_community_bbs_moderator_comment_moderation_actions_create } from "../../../generate/generate_random_community_bbs_moderator_comment_moderation_actions_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_comment_action_logging(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(12) + "@example.com",
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Define the reason for the moderation action
  const reasonText: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  // Step 3: Create a moderation action on the comment
  // The target_comment_id is extracted from the URL path by the system
  // The action_type is determined by the system context
  // We only provide the reason in the request body
  const moderationAction: ICommunityBbsCommentModerationAction =
    await generate_random_community_bbs_moderator_comment_moderation_actions_create(
      moderatorConnection, // Pass authenticated moderator connection
      {
        body: {
          reason: reasonText,
        } satisfies ICommunityBbsCommentModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  // Step 4: Validate the moderation action record
  // Verify moderator_id matches authenticating user's ID
  TestValidator.equals(
    "moderator_id matches authenticating moderator",
    moderationAction.moderator_id,
    moderator.id,
  );
  // Verify reason matches the provided reason
  TestValidator.equals(
    "reason matches provided reason",
    moderationAction.reason,
    reasonText,
  );
  // Verify status is 'pending' (default as per scenario)
  TestValidator.equals("status is pending", moderationAction.status, "pending");
}
