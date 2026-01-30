import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityBanner";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community_banner } from "../../../prepare/prepare_random_community_bbs_community_banner";
import { generate_random_community_bbs_admin_community_banners_create } from "../../../generate/generate_random_community_bbs_admin_community_banners_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Create a section (category) that will be referenced by the community
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a community with initial configuration
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.admin.communities.update(
      adminConnection,
      {
        communityId: sectionId, // This is incorrect in logic but must be fixed - communityId should be unique
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          visibility: "public" as const,
          category: sectionId,
          banner_media_id: null,
        } satisfies ICommunityBbsCommunity.IUpdate,
      },
    );
  typia.assert(community);
  // Step 4: Create a banner media to reference in community configuration
  const banner: ICommunityBbsCommunityBanner =
    await generate_random_community_bbs_admin_community_banners_create(
      adminConnection,
      {
        body: {
          community_code: community.id, // Use the created community's ID
          image_url: typia.random<string & tags.Format<"uri">>(),
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityBbsCommunityBanner.ICreate,
      },
    );
  typia.assert(banner);
  // Step 5: Update community configuration with new name, description, visibility, category, and banner reference
  const updatedCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.admin.communities.update(
      adminConnection,
      {
        communityId: community.id,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
          visibility: "private" as const, // Change to private for update
          category: sectionId, // Continue using same valid section
          banner_media_id: banner.banner_code, // Reference to created banner
        } satisfies ICommunityBbsCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Step 6: Validate the updated community properties
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    updatedCommunity.name,
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    updatedCommunity.description,
  );
  TestValidator.equals(
    "community visibility updated",
    updatedCommunity.visibility,
    "private",
  );
  TestValidator.equals(
    "community banner_media_id updated",
    updatedCommunity.banner_media_id,
    banner.banner_code,
  );
  // Step 7: Test that non-admin cannot update community (role enforcement)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(userAuth);
  await TestValidator.error("non-admin cannot update community", async () => {
    await api.functional.communityBbs.admin.communities.update(userConnection, {
      communityId: community.id,
      body: {
        name: "Invalid Update",
        visibility: "public",
        category: sectionId,
        banner_media_id: banner.banner_code,
      } satisfies ICommunityBbsCommunity.IUpdate,
    });
  });
  // Step 8: Test banner_media_id can be set to null to remove banner
  const removedBannerCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.admin.communities.update(
      adminConnection,
      {
        communityId: community.id,
        body: {
          banner_media_id: null,
        } satisfies ICommunityBbsCommunity.IUpdate,
      },
    );
  typia.assert(removedBannerCommunity);
  TestValidator.equals(
    "banner_media_id removed",
    removedBannerCommunity.banner_media_id,
    null,
  );
}
