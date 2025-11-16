import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a valid community creation payload
  const communityBodyUnauthed = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 2. Call create endpoint without authentication using a cloned unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "community creation must fail without authentication",
    401,
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        unauthenticatedConnection,
        { body: communityBodyUnauthed },
      );
    },
  );

  // 3. Perform authenticated flow
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 4. Authenticated community creation
  const communityBodyAuthed = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBodyAuthed },
    );
  typia.assert(createdCommunity);

  // Basic business assertions
  TestValidator.equals(
    "created community slug should match input",
    createdCommunity.slug,
    communityBodyAuthed.slug,
  );
  TestValidator.equals(
    "created community name should match input",
    createdCommunity.name,
    communityBodyAuthed.name,
  );

  TestValidator.predicate(
    "owner_memberuser_id should be a non-empty string",
    typeof createdCommunity.owner_memberuser_id === "string" &&
      createdCommunity.owner_memberuser_id.length > 0,
  );
}
