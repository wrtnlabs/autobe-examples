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

export async function test_api_member_profile_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and register with complete profile
  const memberConnection: api.IConnection = { host: connection.host };
  const originalProfile = await authorize_member_join(memberConnection, {
    body: {
      firstName: "OriginalFirst",
      lastName: "OriginalLast",
      avatarUrl: "https://example.com/avatar.jpg",
      timezone: "Asia/Seoul",
      locale: "ko-KR",
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  // Prepare partial update data - only firstName and timezone
  const newFirstName = "UpdatedFirst";
  const newTimezone = "America/New_York";
  // Execute partial profile update
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        firstName: newFirstName,
        timezone: newTimezone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Validate updated fields reflect new values
  TestValidator.equals(
    "firstName updated",
    updatedProfile.firstName,
    newFirstName,
  );
  TestValidator.equals(
    "timezone updated",
    updatedProfile.timezone,
    newTimezone,
  );
  // Validate omitted fields preserve original values
  TestValidator.equals(
    "lastName preserved",
    updatedProfile.lastName,
    originalProfile.lastName,
  );
  TestValidator.equals(
    "avatarUrl preserved",
    updatedProfile.avatarUrl satisfies string | null | undefined as string | null | undefined,
    originalProfile.avatarUrl satisfies string | null | undefined as string | null | undefined,
  );
  TestValidator.equals(
    "locale preserved",
    updatedProfile.locale,
    originalProfile.locale,
  );
  // Validate timestamp behavior
  TestValidator.equals(
    "createdAt unchanged",
    updatedProfile.createdAt,
    originalProfile.createdAt,
  );
  TestValidator.predicate(
    "updatedAt refreshed",
    new Date(updatedProfile.updatedAt) > new Date(originalProfile.updatedAt),
  );
}