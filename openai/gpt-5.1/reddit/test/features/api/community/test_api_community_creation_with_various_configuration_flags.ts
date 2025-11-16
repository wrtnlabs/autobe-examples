import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate creation of communities with various configuration flag
 * combinations.
 *
 * Business goal: Ensure that when an authenticated memberUser creates
 * communities with different combinations of configuration flags (NSFW,
 * quarantine, posting restriction, and allowed post types), the backend accepts
 * these combinations and persists them exactly as requested.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a memberUser via POST /auth/memberUser/join.
 *
 *    - Request body: ICommunityPlatformMemberuser.IJoin
 *    - Response: ICommunityPlatformMemberuser.IAuthorized, including token bundle
 *         and member user id.
 *    - The SDK automatically stores the access token into connection headers.
 * 2. Using the authenticated connection, call POST
 *    /communityPlatform/memberUser/communities multiple times via
 *    api.functional.communityPlatform.memberUser.communities.create with
 *    ICommunityPlatformCommunity.ICreate payloads that cover representative
 *    configurations:
 *
 *    - Public, active, non-NSFW, non-quarantined, unrestricted posting, all post
 *         types allowed.
 *    - NSFW community: is_nsfw=true, still non-quarantined, unrestricted posting,
 *         all post types allowed.
 *    - Quarantined community: is_quarantined=true with other flags left in a normal
 *         state.
 *    - Read-only community: is_posting_restricted=true with all post types allowed.
 *    - Post-type restricted communities: combinations where one or two of
 *         allow_text_posts, allow_link_posts, allow_image_posts are false while
 *         others remain true.
 * 3. For each created community, assert:
 *
 *    - The response structurally matches ICommunityPlatformCommunity via
 *         typia.assert.
 *    - All configuration boolean flags in the response match the values sent in the
 *         ICreate body.
 *    - Identity and descriptive fields (slug, name, visibility, status) are
 *         preserved from the request.
 *    - Owner_memberuser_id in the response equals the authenticated memberUser's id
 *         from the join step.
 *    - Created_at, updated_at, and id are structurally valid (via typia.assert) and
 *         deleted_at is not set on a fresh community.
 *
 * This test does not attempt to validate error behavior, HTTP status codes, or
 * type mismatches. All request bodies strictly satisfy their DTO contracts,
 * focusing solely on positive-path business behavior for configuration flag
 * persistence.
 */
export async function test_api_community_creation_with_various_configuration_flags(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser.
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const ownerId: string & tags.Format<"uuid"> = authorized.id;

  // Helper to create a unique slug per scenario.
  const createSlug = (prefix: string): string => {
    const suffix = RandomGenerator.alphaNumeric(8);
    return `${prefix}-${suffix}`;
  };

  // Helper function to create and validate a community with expected flags.
  const createAndValidate = async (
    title: string,
    input: ICommunityPlatformCommunity.ICreate,
  ): Promise<ICommunityPlatformCommunity> => {
    const created: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: input,
        },
      );
    typia.assert<ICommunityPlatformCommunity>(created);

    // Validate identity fields
    TestValidator.equals(
      `${title} - slug should match input`,
      created.slug,
      input.slug,
    );
    TestValidator.equals(
      `${title} - name should match input`,
      created.name,
      input.name,
    );
    TestValidator.equals(
      `${title} - visibility should match input`,
      created.visibility,
      input.visibility,
    );
    TestValidator.equals(
      `${title} - status should match input`,
      created.status,
      input.status,
    );

    // Validate configuration flags
    TestValidator.equals(
      `${title} - is_nsfw should match input`,
      created.is_nsfw,
      input.is_nsfw,
    );
    TestValidator.equals(
      `${title} - is_quarantined should match input`,
      created.is_quarantined,
      input.is_quarantined,
    );
    TestValidator.equals(
      `${title} - is_posting_restricted should match input`,
      created.is_posting_restricted,
      input.is_posting_restricted,
    );
    TestValidator.equals(
      `${title} - allow_text_posts should match input`,
      created.allow_text_posts,
      input.allow_text_posts,
    );
    TestValidator.equals(
      `${title} - allow_link_posts should match input`,
      created.allow_link_posts,
      input.allow_link_posts,
    );
    TestValidator.equals(
      `${title} - allow_image_posts should match input`,
      created.allow_image_posts,
      input.allow_image_posts,
    );

    // Validate ownership
    TestValidator.equals(
      `${title} - owner_memberuser_id should match authenticated user id`,
      created.owner_memberuser_id,
      ownerId,
    );

    // deleted_at should be undefined for a newly created community (soft delete not applied)
    TestValidator.equals(
      `${title} - deleted_at should be undefined on creation`,
      created.deleted_at,
      undefined,
    );

    return created;
  };

  const visibility = "public";
  const status = "active";

  // 2-1. Baseline community: public, non-NSFW, non-quarantined, unrestricted posting, all post types allowed.
  const baselineCreate = {
    slug: createSlug("baseline"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("baseline community", baselineCreate);

  // 2-2. NSFW community: NSFW true, otherwise similar to baseline.
  const nsfwCreate = {
    slug: createSlug("nsfw"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: true,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("nsfw community", nsfwCreate);

  // 2-3. Quarantined community: quarantined true, NSFW false.
  const quarantinedCreate = {
    slug: createSlug("quarantined"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: false,
    is_quarantined: true,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("quarantined community", quarantinedCreate);

  // 2-4. Read-only community: posting restricted true, all post types allowed.
  const readOnlyCreate = {
    slug: createSlug("readonly"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("read-only community", readOnlyCreate);

  // 2-5. Post-type restricted communities.
  // Case A: Text-only community (no link or image posts).
  const textOnlyCreate = {
    slug: createSlug("text-only"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("text-only community", textOnlyCreate);

  // Case B: Link-and-image-only community (no text posts).
  const linkImageOnlyCreate = {
    slug: createSlug("link-image-only"),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility,
    status,
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: false,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  await createAndValidate("link-image-only community", linkImageOnlyCreate);
}
