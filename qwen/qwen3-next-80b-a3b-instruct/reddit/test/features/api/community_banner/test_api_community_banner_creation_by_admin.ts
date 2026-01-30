import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityBanner";
import { prepare_random_community_bbs_community_banner } from "../../../prepare/prepare_random_community_bbs_community_banner";
import { generate_random_community_bbs_admin_community_banners_create } from "../../../generate/generate_random_community_bbs_admin_community_banners_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_banner_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create banner with valid parameters
  const communityCode = "community-123"; // Realistic community code format
  const imageUrl = typia.random<string & tags.Format<"uri">>();
  const priority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const banner: ICommunityBbsCommunityBanner =
    await api.functional.communityBbs.admin.community_banners.create(
      adminConnection,
      {
        body: {
          community_code: communityCode,
          image_url: imageUrl,
          priority: priority,
        } satisfies ICommunityBbsCommunityBanner.ICreate,
      },
    );
  typia.assert(banner);
  // Step 3: Validate banner response meets business requirements
  TestValidator.equals(
    "banner is associated with correct community",
    banner.community_code,
    communityCode,
  );
  TestValidator.equals(
    "banner display_order matches submitted priority",
    banner.display_order,
    priority,
  );
  TestValidator.equals("banner is immediately active", banner.is_active, true);
  TestValidator.equals(
    "banner image_url matches submitted value",
    banner.image_url,
    imageUrl,
  );
  TestValidator.predicate(
    "banner_code is UUID format",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      banner.banner_code,
    ),
  );
}
