import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_detail_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and acquires authorization token
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a top-level comment (parent comment)
  const parentComment =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      { body: {} },
    );
  typia.assert(parentComment);
  // 3. Create a direct child comment (reply) to the parent
  const firstLevelReply =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      {
        body: {
          parent_id: (parentComment as any).id,
        },
      },
    );
  typia.assert(firstLevelReply);
  // 4. Create a second-level nested reply (child of firstLevelReply)
  const secondLevelReply =
    await generate_random_community_platform_user_comments_create(
      userConnection,
      {
        body: {
          parent_id: (firstLevelReply as any).id,
        },
      },
    );
  typia.assert(secondLevelReply);
  // 5. Retrieve the top-level parent comment detail
  const retrievedParent =
    await api.functional.communityPlatform.user.comments.at(userConnection, {
      commentId: (parentComment as any).id,
    });
  typia.assert(retrievedParent);
  const retrievedParentAny = retrievedParent as any;
  // 6. Validate that the retrieved parent comment ID matches the original
  TestValidator.equals(
    "parent comment id matches",
    retrievedParentAny.id,
    (parentComment as any).id,
  );
  // 7. Validate that the replies breadth and depth are correct
  TestValidator.predicate(
    "parent has nested replies",
    Array.isArray(retrievedParentAny.replies) &&
      retrievedParentAny.replies.length > 0,
  );
  const firstReply = retrievedParentAny.replies[0];
  // Validate first-level reply correctness
  TestValidator.equals(
    "first-level reply parent id",
    firstReply.parent_id,
    (parentComment as any).id,
  );
  TestValidator.equals(
    "first-level reply id matches",
    firstReply.id,
    (firstLevelReply as any).id,
  );
  // Validate that first reply has nested replies
  TestValidator.predicate(
    "first-level reply has nested replies",
    Array.isArray(firstReply.replies) && firstReply.replies.length > 0,
  );
  const secondReply = firstReply.replies[0];
  // Validate second-level reply correctness
  TestValidator.equals(
    "second-level reply parent id",
    secondReply.parent_id,
    (firstLevelReply as any).id,
  );
  TestValidator.equals(
    "second-level reply id matches",
    secondReply.id,
    (secondLevelReply as any).id,
  );
  // 8. Validate parent relationship of first-level reply points to the parent comment
  TestValidator.equals(
    "first-level reply parent id matches parent comment",
    firstReply.parent_id,
    (parentComment as any).id,
  );
  // 9. Validate parent relationship of second-level reply points to the first-level reply
  TestValidator.equals(
    "second-level reply parent id matches first-level reply",
    secondReply.parent_id,
    (firstLevelReply as any).id,
  );
  // 10. Validate grandparent property exists and matches parent comment's parent_id (if applicable)
  if (firstReply.parent_id !== null && (retrievedParentAny.parent_id === null || retrievedParentAny.parent_id === undefined)) {
    TestValidator.equals(
      "parent's parent_id is null for top-level",
      retrievedParentAny.parent_id,
      null,
    );
  }
  // 11. Optionally validate that the content strings are non-empty
  TestValidator.predicate(
    "parent comment has content",
    typeof retrievedParentAny.content === "string" &&
      retrievedParentAny.content.length > 0,
  );
  TestValidator.predicate(
    "first-level reply has content",
    typeof firstReply.content === "string" && firstReply.content.length > 0,
  );
  TestValidator.predicate(
    "second-level reply has content",
    typeof secondReply.content === "string" && secondReply.content.length > 0,
  );
}
