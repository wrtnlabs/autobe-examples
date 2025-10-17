import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_community_at_public_retrieval(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate that a public community created by an authenticated
   * member is retrievable by an unauthenticated caller and that the returned
   * shape includes the expected fields. Also assert that active communities are
   * not soft-deleted (deleted_at === null) and that requesting a non-existent
   * community ID results in an error.
   *
   * Steps:
   *
   * 1. Register a member (POST /auth/member/join)
   * 2. Create a public community (POST /communityPortal/member/communities)
   * 3. Retrieve community as unauthenticated client (GET
   *    /communityPortal/communities/:id)
   * 4. Assert response fields and invariants
   * 5. Attempt to GET a random UUID and assert an error is thrown
   */

  // 1) Register a test member to act as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);

  // 2) Create a public community with the authenticated member
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    slug: `${memberUsername}-${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 6,
      wordMax: 12,
    }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Retrieve the community as an unauthenticated client
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const read: ICommunityPortalCommunity =
    await api.functional.communityPortal.communities.at(unauthConn, {
      communityId: community.id,
    });
  typia.assert(read);

  // 4) Business-level assertions
  TestValidator.equals("community id matches created", read.id, community.id);
  TestValidator.equals("community name matches", read.name, community.name);
  TestValidator.equals("community slug matches", read.slug, community.slug);
  TestValidator.equals(
    "visibility is public",
    read.visibility,
    community.visibility,
  );
  TestValidator.equals(
    "is_private flag preserved",
    read.is_private,
    community.is_private,
  );

  // Description may be null, compare with explicit null when community.description is undefined
  TestValidator.equals(
    "description matches",
    read.description,
    community.description ?? null,
  );

  // Creator reference: if present, it should match the created record's value
  if (read.creator_user_id !== null && read.creator_user_id !== undefined) {
    TestValidator.equals(
      "creator_user_id matches",
      read.creator_user_id,
      community.creator_user_id,
    );
  }

  // Active community must not be soft-deleted
  TestValidator.equals(
    "deleted_at should be null for active communities",
    read.deleted_at,
    null,
  );

  // Timestamps presence
  TestValidator.predicate(
    "created_at present",
    read.created_at !== null && read.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at present",
    read.updated_at !== null && read.updated_at !== undefined,
  );

  // 5) Non-existent community id should cause an error when fetched.
  //    We assert an error is thrown without checking specific HTTP status codes.
  await TestValidator.error(
    "requesting non-existent community should fail",
    async () => {
      await api.functional.communityPortal.communities.at(unauthConn, {
        communityId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
