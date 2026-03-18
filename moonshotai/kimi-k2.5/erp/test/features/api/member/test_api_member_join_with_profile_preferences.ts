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

export async function test_api_member_join_with_profile_preferences(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection following isolation pattern
  const memberConnection: api.IConnection = { host: connection.host };
  // Define specific profile preferences to validate storage and retrieval
  const avatarUrl = "https://example.com/avatars/member-profile.jpg";
  const timezone = "Asia/Seoul";
  const locale = "en-US";
  // Execute join with complete optional profile preferences using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      avatarUrl,
      timezone,
      locale,
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  // Validate complete response structure and types
  typia.assert(authorized);
  // Validate profile preferences are correctly stored and returned
  TestValidator.equals(
    "avatarUrl matches input",
    authorized.avatarUrl,
    avatarUrl,
  );
  TestValidator.equals("timezone matches input", authorized.timezone, timezone);
  TestValidator.equals("locale matches input", authorized.locale, locale);
}
