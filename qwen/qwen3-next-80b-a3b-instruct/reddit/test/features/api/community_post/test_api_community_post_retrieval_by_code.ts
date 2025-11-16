import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_community_post_retrieval_by_code(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authentication context
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: "StrongPass123!@#",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Create a post in a community
  // Since ICommunityPlatformPost.ICreate = string, we send a JSON string representing the post
  const postUuid = typia.random<string & tags.Format<"uuid">>();
  const communityCode: string = "community-" + RandomGenerator.alphaNumeric(8);
  const postStructure = {
    id: postUuid,
    communityCode: communityCode,
    postCode: "post-" + RandomGenerator.alphaNumeric(8),
    title: "Test Post Title",
    summary: "This is a test post summary for retrieval validation.",
    type: "text" as const,
    content: "This is a test post content for retrieval validation.",
    authorId: joinResponse.id,
    authorName: joinResponse.email.split("@")[0],
    voteCount: 12,
    commentCount: 5,
    createdAt: new Date().toISOString(),
  };

  const createBody: string = JSON.stringify(postStructure);
  const createResponse: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode: communityCode,
        body: createBody satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(createResponse);

  // Step 3: Retrieve the created post by communityCode and postCode
  // We must use the postCode from object structure we set
  // The API returns a string (which is the serialized JSON we sent)
  // We assume the client will use postCode from postStructure to retrieve
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode: communityCode,
      postCode: postStructure.postCode, // Use the same postCode from structure
    });
  typia.assert(retrievedPost);

  // Step 4: Validate that the retrieved string is a valid JSON string and contains expected data
  // We know what we sent, so we parse it and validate
  const parsedRetrieved: any = JSON.parse(retrievedPost);

  TestValidator.equals(
    "retrieved post UUID matches",
    parsedRetrieved.id,
    postUuid,
  );
  TestValidator.equals(
    "retrieved post title matches",
    parsedRetrieved.title,
    postStructure.title,
  );
  TestValidator.equals(
    "retrieved post summary matches",
    parsedRetrieved.summary,
    postStructure.summary,
  );
  TestValidator.equals(
    "retrieved post type matches",
    parsedRetrieved.type,
    postStructure.type,
  );
  TestValidator.equals(
    "retrieved post content matches",
    parsedRetrieved.content,
    postStructure.content,
  );
  TestValidator.equals(
    "retrieved post authorId matches",
    parsedRetrieved.authorId,
    joinResponse.id,
  );
  TestValidator.predicate(
    "vote count is non-negative",
    parsedRetrieved.voteCount >= 0,
  );
  TestValidator.predicate(
    "comment count is non-negative",
    parsedRetrieved.commentCount >= 0,
  );

  // Step 5: Test retrieve non-existent post to verify error handling
  // Use a different, invalid postCode
  const invalidPostCode: string =
    "invalid-post-code-" + RandomGenerator.alphaNumeric(8);
  await TestValidator.error(
    "non-existent post should return error",
    async () => {
      await api.functional.communityPlatform.communities.posts.at(connection, {
        communityCode: communityCode,
        postCode: invalidPostCode,
      });
    },
  );
}
