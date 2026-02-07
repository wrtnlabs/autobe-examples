import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_platform_metadata_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin user account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminJoinResponse);
  // 2. Create a member user account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  typia.assert(memberJoinResponse);
  // 3. Log in as the member (non-admin) user
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: typia.random<ICommunityMember.ILogin>(),
  });
  // 4. Log in as admin and use a randomly generated UUID for metadataId
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: typia.random<ICommunityAdmin.ILogin>(),
  });
  // Generate a valid UUID for metadataId (since ICommunityPlatformMetadatum has no 'id' property)
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // Update the record as admin — this must succeed (in simulation) to validate our ID is acceptable
  const metadataUpdate =
    await api.functional.community.admin.platform_metadata.update(
      adminLoginConnection,
      {
        metadataId,
        body: typia.random<ICommunityPlatformMetadatum.IUpdate>(),
      },
    );
  typia.assert(metadataUpdate);
  // 5. Now attempt the same update as the non-admin member — expect 403 Forbidden
  await TestValidator.httpError(
    "non-admin user should receive 403 Forbidden when updating platform metadata",
    403,
    async () => {
      await api.functional.community.admin.platform_metadata.update(
        memberLoginConnection,
        {
          metadataId,
          body: typia.random<ICommunityPlatformMetadatum.IUpdate>(),
        },
      );
    },
  );
}
