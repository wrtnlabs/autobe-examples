import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_moderation_action_retrieval_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate first citizen user
  const actor1Connection: api.IConnection = { host: connection.host };
  const actor1: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    actor1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(actor1);
  // Step 2: Create a new moderation action object that targets actor1's content
  // Since we don't have a create endpoint, we'll construct a valid moderation action object
  // with a generated UUID that can be used to test retrieval
  const actionId: string = typia.random<string & tags.Format<"uuid">>();
  const moderationAction: IDiscussionBoardModerationAction = {
    id: actionId,
    target_type: "article" as const,
    target_id: actor1.id,
    action_type: "CONTENT_REMOVAL" as const,
    reason: "Violation of community guidelines",
    severity_level: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    action_status: "active" as const,
  };
  typia.assert(moderationAction);
  // Step 3: Retrieve the moderation action as actor1 (content owner)
  // This should succeed since the action targets actor1's content
  const retrievedByOwner: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderation_actions.at(
      actor1Connection,
      {
        actionId: moderationAction.id,
      },
    );
  typia.assert(retrievedByOwner);
  TestValidator.equals(
    "retrieved action ID matches created action",
    retrievedByOwner.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "retrieved action target ID matches",
    retrievedByOwner.target_id,
    actor1.id,
  );
  TestValidator.equals(
    "retrieved action target type matches",
    retrievedByOwner.target_type,
    "article",
  );
  // Step 4: Authenticate a second citizen user (actor2)
  const actor2Connection: api.IConnection = { host: connection.host };
  const actor2: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    actor2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(actor2);
  // Step 5: Attempt to retrieve the same moderation action as actor2 (content owner of different content)
  // This should fail with a 403 Forbidden error because actor2 doesn't own the moderated content
  await TestValidator.error(
    "regular user cannot retrieve moderation action on others' content",
    async () => {
      await api.functional.discussionBoard.moderation_actions.at(
        actor2Connection,
        {
          actionId: moderationAction.id,
        },
      );
    },
  );
}
