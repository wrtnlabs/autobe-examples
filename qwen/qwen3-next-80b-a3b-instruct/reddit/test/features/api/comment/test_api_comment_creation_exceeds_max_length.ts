import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_creation_exceeds_max_length(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "ValidPassword123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMember.ICreate,
  });
  typia.assert(member);

  const communityCode: string = typia.random<string>();
  const postResponse =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: "" satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postResponse);

  const postCode: string = typia.random<string & tags.Format<"uuid">>();

  // Generate a string longer than 500 characters (approximately 520 characters)
  const longCommentContent = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 10,
    sentenceMax: 10,
    wordMin: 10,
    wordMax: 10,
  }); // This generates around 10 * 10 * 10 = 1000 characters

  await TestValidator.error(
    "comment creation should fail with content exceeding 500 characters",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.create(
        connection,
        {
          communityCode: communityCode,
          postCode: postCode,
          body: longCommentContent,
        },
      );
    },
  );
}
