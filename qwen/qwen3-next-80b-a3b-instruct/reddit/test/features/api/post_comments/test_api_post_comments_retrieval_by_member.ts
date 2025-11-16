import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_post_comments_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish context for the test
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(memberJoinResponse);

  // Step 2: Create a post in a community using the authenticated member's context
  // ICommunityPlatformPost.ICreate and ICommunityPlatformPost are defined as string in the schema
  // We use a JSON string representation as the body
  const communityCode: string =
    "comm-" + typia.random<string & tags.Format<"uuid">>();
  const postRequestBody: string = JSON.stringify({
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  });

  const postResponseStr: string =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: postRequestBody, // satisfies ICommunityPlatformPost.ICreate
      },
    );
  typia.assert<string>(postResponseStr);

  // Parse the string response to extract the postCode
  // The server returns a JSON string with the post details
  const postResponse = JSON.parse(postResponseStr) as { id: string };
  const postCode: string = postResponse.id;

  // Step 3: Retrieve comments on the created post using the authenticated member's token
  // The token is automatically handled by the SDK through the connection headers after join
  const commentsResponseStr: string =
    await api.functional.communityPlatform.communities.posts.comments.index(
      connection,
      {
        communityCode: communityCode,
        postCode: postCode,
      },
    );
  typia.assert<string>(commentsResponseStr);

  // Step 4: Very basic validation
  // The schema defines the response as string, so we can't validate its structure
  // We test only that the call succeeded (typia.assert ensures it's a non-empty string)
  TestValidator.predicate(
    "comments response is non-empty string",
    commentsResponseStr.length > 0,
  );
}
