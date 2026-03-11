import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalCreatedAt = joinResult.created_at;
  const originalId = joinResult.id;
  const originalStatus = joinResult.status;
  const originalArticlesCount = joinResult.articles_count;
  const originalCommentsCount = joinResult.comments_count;
  // 2. Update profile with new display_name and bio
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updateResult =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 3. Verify updated fields match the new values
  TestValidator.equals(
    "display_name updated",
    updateResult.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updateResult.bio, newBio);
  // 4. Verify updated_at timestamp has changed from original registration time
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    originalCreatedAt,
  );
  // 5. Verify unchanged fields remain the same
  TestValidator.equals("id unchanged", updateResult.id, originalId);
  TestValidator.equals("status unchanged", updateResult.status, originalStatus);
  TestValidator.equals(
    "articles_count unchanged",
    updateResult.articles_count,
    originalArticlesCount,
  );
  TestValidator.equals(
    "comments_count unchanged",
    updateResult.comments_count,
    originalCommentsCount,
  );
}
