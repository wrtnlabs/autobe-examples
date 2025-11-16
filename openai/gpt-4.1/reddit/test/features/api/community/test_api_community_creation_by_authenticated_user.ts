import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate authenticated user community creation business rules and anti-abuse
 * controls.
 *
 * 1. Register a new user and obtain authentication.
 * 2. Create a new community (with all fields).
 * 3. Check properties: valid ID, name (slug), display_title, description,
 *    visibility, status, created_at, updated_at (not null), name matches input
 *    and is unique.
 * 4. Attempt duplicate community creation (same name) and expect error.
 * 5. Flood endpoint with rapid requests to confirm rate limit or anti-abuse
 *    response.
 */
export async function test_api_community_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // Step 2: Prepare community create input
  const uniqueName = RandomGenerator.alphaNumeric(12).toLowerCase(); // slug-like uniqueness
  const createBody = {
    name: uniqueName,
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    status: "active",
    image_url:
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uri">>(),
      ]) ?? null,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 3: Create the community
  const created =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "community name (slug) matches input",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "display title matches",
    created.display_title,
    createBody.display_title,
  );
  TestValidator.equals(
    "description matches",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "visibility matches",
    created.visibility,
    createBody.visibility,
  );
  TestValidator.equals("status matches", created.status, createBody.status);
  TestValidator.predicate(
    "community id is valid uuid",
    typeof created.id === "string" && /^[0-9a-f-]{36}$/i.test(created.id),
  );
  TestValidator.predicate(
    "created_at is defined",
    typeof created.created_at === "string" && !!created.created_at,
  );
  TestValidator.predicate(
    "updated_at is defined",
    typeof created.updated_at === "string" && !!created.updated_at,
  );

  // Step 4: Attempt duplicate community creation (same 'name')
  await TestValidator.error(
    "duplicate community name/slug returns error",
    async () => {
      await api.functional.communityPlatform.user.communities.create(
        connection,
        { body: createBody },
      );
    },
  );

  // Step 5: Anti-abuse check - try quick multiple creations (should hit rate limit)
  const communityBodies = ArrayUtil.repeat(
    4,
    (i) =>
      ({
        name: RandomGenerator.alphaNumeric(12).toLowerCase(),
        display_title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "invite-only",
        ] as const),
        status: "active",
        image_url: null,
      }) satisfies ICommunityPlatformCommunity.ICreate,
  );

  let limitTriggered = false;
  for (const body of communityBodies) {
    try {
      await api.functional.communityPlatform.user.communities.create(
        connection,
        { body },
      );
    } catch {
      limitTriggered = true;
      break;
    }
  }
  TestValidator.predicate(
    "rate limit or anti-abuse triggers after multiple community creations",
    limitTriggered,
  );
}
