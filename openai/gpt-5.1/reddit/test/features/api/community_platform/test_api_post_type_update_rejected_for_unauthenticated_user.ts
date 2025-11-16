import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that unauthenticated callers cannot update community platform post
 * type definitions.
 *
 * Business context: Post type definitions (ICommunityPlatformPostType) are
 * global configuration entities managed by platform administrators. They
 * determine how posts behave and which fields are required. For safety, only
 * authenticated platformAdmin actors may change them. Anonymous callers must
 * not be able to modify these records even if they know a valid postTypeId and
 * send a structurally valid update payload.
 *
 * Test steps:
 *
 * 1. Register and authenticate a platform administrator using
 *    api.functional.auth.platformAdmin.join with a random
 *    ICommunityPlatformPlatformadmin.IJoin payload. The SDK will automatically
 *    attach the returned JWT access token to the connection headers for
 *    subsequent calls as the platformAdmin actor.
 * 2. Using this authenticated connection, create a new post type via
 *    api.functional.communityPlatform.platformAdmin.postTypes.create with a
 *    random ICommunityPlatformPostType.ICreate payload. Capture the
 *    ICommunityPlatformPostType response as originalPostType and assert its
 *    structure with typia.assert.
 * 3. Prepare a valid update body object that satisfies
 *    ICommunityPlatformPostType.IUpdate, changing at least the `name` and
 *    `description` fields to distinct new values so that an actual change would
 *    be observable. Optionally also modify `code` to a new value.
 * 4. Derive an unauthenticated connection by shallow-copying the incoming
 *    `connection` argument and overriding its headers to an empty object:
 *    `const unauthConnection: api.IConnection = { ...connection, headers: {}
 *    };` Per global rules, do not touch this headers object again after
 *    creation.
 * 5. Attempt to call
 *    api.functional.communityPlatform.platformAdmin.postTypes.update using the
 *    unauthenticated connection:
 *
 *    - PostTypeId: originalPostType.id
 *    - Body: updateBody
 *
 *    Wrap this call with `await TestValidator.error("unauthenticated post type
 *    update must fail", async () => { ... })` so that the test asserts an error
 *    is thrown. Do not inspect status codes or error message contents; only
 *    assert that an error occurs.
 * 6. Because we have no GET endpoint for a single post type in the SDK, we cannot
 *    re-fetch to prove persistence is unchanged. Instead, we assert that the
 *    unauthorized update did not return a successful ICommunityPlatformPostType
 *    response by virtue of the error expectation in step 5.
 * 7. As a sanity check, we can still assert that the originalPostType is a valid
 *    ICommunityPlatformPostType via typia.assert and that the update body
 *    fields differ from the original values to ensure the test setup is
 *    meaningful.
 */
export async function test_api_post_type_update_rejected_for_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline post type as the authenticated platform admin.
  const createBody = typia.random<ICommunityPlatformPostType.ICreate>();
  const originalPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalPostType);

  // 3. Prepare a valid update payload that attempts to change name and description.
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformPostType.IUpdate;

  // Sanity check: ensure at least one field in the update differs from original.
  await TestValidator.predicate(
    "update name or description differs from original",
    () =>
      (updateBody.name !== undefined &&
        updateBody.name !== originalPostType.name) ||
      (updateBody.description !== undefined &&
        updateBody.description !== originalPostType.description),
  );

  // 4. Build an unauthenticated connection by clearing headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to update using unauthenticated connection and expect an error.
  await TestValidator.error(
    "unauthenticated post type update must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.update(
        unauthConnection,
        {
          postTypeId: originalPostType.id,
          body: updateBody,
        },
      );
    },
  );

  // 6. We rely on the fact that the update call failed; therefore no
  // successful ICommunityPlatformPostType response was returned to the
  // unauthenticated caller, satisfying the authorization boundary requirement.
}
