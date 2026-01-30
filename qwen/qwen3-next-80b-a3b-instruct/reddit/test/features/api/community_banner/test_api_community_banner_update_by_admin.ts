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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_community_banner_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate via join
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
  // Step 2: Generate a non-existent banner ID - since we cannot create banners,
  // we test the error condition of updating a non-existent banner
  const nonExistentBannerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Define update data
  const updateData = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
    >(),
    is_active: RandomGenerator.pick([true, false]),
    image_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityBbsCommunityBanner.IUpdate;
  // Step 4: Test that updating a non-existent banner throws an error
  await TestValidator.error(
    "updating non-existent banner should fail",
    async () => {
      await api.functional.communityBbs.admin.community_banners.update(
        adminConnection,
        {
          bannerId: nonExistentBannerId,
          body: updateData,
        },
      );
    },
  );
}