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

export async function test_api_admin_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with profile data
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const initialDisplayName = RandomGenerator.name();
  const initialPhone = RandomGenerator.mobile();
  const initialAvatarUri = typia.random<string & tags.Format<"uri">>();
  const authorized = await api.functional.erpHrm.auth.admin.join(
    adminConnection,
    {
      body: {
        email,
        password,
        displayName: initialDisplayName,
        phone: initialPhone,
        avatarUri: initialAvatarUri,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmAdmin.IJoin,
    },
  );
  typia.assert(authorized);
  // Store initial values for comparison
  const initialId = authorized.id;
  const initialEmail = authorized.email;
  const initialCreatedAt = authorized.created_at;
  // 2. Update ONLY display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.erpHrm.admin.profile.update(
    adminConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify display_name was changed
  TestValidator.equals(
    "display_name changed to new value",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name is different from initial",
    updatedProfile.display_name,
    initialDisplayName,
  );
  // 4. Verify phone remained unchanged (preserved)
  TestValidator.equals(
    "phone preserved after partial update",
    updatedProfile.phone,
    initialPhone,
  );
  // 5. Verify avatar_uri remained unchanged (preserved)
  TestValidator.equals(
    "avatar_uri preserved after partial update",
    updatedProfile.avatar_uri,
    initialAvatarUri,
  );
  // 6. Verify other immutable fields remain the same
  TestValidator.equals("id remains unchanged", updatedProfile.id, initialId);
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    initialEmail,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedProfile.created_at,
    initialCreatedAt,
  );
}
