import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Prepare update payload with all profile fields
  const newDisplayName = RandomGenerator.name();
  const newAvatarUri = `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.png`;
  const newPhone = RandomGenerator.mobile();
  // 3. Call profile update endpoint
  const updatedProfile = await api.functional.erpHrm.admin.profile.update(
    adminConnection,
    {
      body: {
        display_name: newDisplayName,
        avatar_uri: newAvatarUri,
        phone: newPhone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  // 4. Validate response with typia.assert (complete runtime validation)
  typia.assert(updatedProfile);
  // 5. Validate business logic - check updated values match input
  TestValidator.equals(
    "display_name updated correctly",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar_uri updated correctly",
    updatedProfile.avatar_uri,
    newAvatarUri,
  );
  TestValidator.equals(
    "phone updated correctly",
    updatedProfile.phone,
    newPhone,
  );
  TestValidator.predicate(
    "updated_at is set",
    updatedProfile.updated_at !== undefined &&
      updatedProfile.updated_at !== null,
  );
}
