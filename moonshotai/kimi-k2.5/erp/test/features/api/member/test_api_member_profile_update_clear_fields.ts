import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Edge case: Remove optional fields by setting them to null.
 * The authenticated member first has a profile with avatarUrl, timezone, and locale set.
 * They then make a PUT request with these same fields set to null to clear them.
 * The operation succeeds and removes those optional values.
 * Validate that the response shows null values for the cleared fields while firstName and lastName are preserved.
 */
export async function test_api_member_profile_update_clear_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with populated optional fields
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      avatarUrl: "https://example.com/avatar.png",
      timezone: "Asia/Seoul",
      locale: "ko-KR",
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  typia.assert(authorized);
  // 2. Update profile to clear optional fields by setting them to null
  const updated = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        avatarUrl: null,
        timezone: null,
        locale: null,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate that cleared fields are null
  TestValidator.equals("avatarUrl is cleared", updated.avatarUrl, null);
  TestValidator.equals("timezone is cleared", updated.timezone, null);
  TestValidator.equals("locale is cleared", updated.locale, null);
  // 4. Validate that firstName and lastName are preserved
  TestValidator.equals(
    "firstName is preserved",
    updated.firstName,
    authorized.firstName,
  );
  TestValidator.equals(
    "lastName is preserved",
    updated.lastName,
    authorized.lastName,
  );
}
