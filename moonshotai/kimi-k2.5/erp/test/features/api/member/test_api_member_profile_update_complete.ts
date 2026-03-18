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
 * Test complete member profile update workflow.
 * 1. Create and authenticate a new member
 * 2. Update profile with all fields (firstName, lastName, avatarUrl, timezone, locale)
 * 3. Validate the response contains all updated fields
 * 4. Verify updatedAt timestamp reflects the modification
 */
export async function test_api_member_profile_update_complete(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(authorizedMember);
  // 2. Prepare complete update data
  const updateBody = {
    firstName: RandomGenerator.name(1),
    lastName: RandomGenerator.name(1),
    avatarUrl: `https://example.com/avatars/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    timezone: "Asia/Seoul",
    locale: "ko-KR",
  } satisfies IErpHrmMember.IUpdate;
  // 3. Update profile
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 4. Validate all fields were updated correctly
  TestValidator.equals(
    "firstName updated",
    updatedProfile.firstName,
    updateBody.firstName,
  );
  TestValidator.equals(
    "lastName updated",
    updatedProfile.lastName,
    updateBody.lastName,
  );
  TestValidator.equals(
    "avatarUrl updated",
    updatedProfile.avatarUrl,
    updateBody.avatarUrl,
  );
  TestValidator.equals(
    "timezone updated",
    updatedProfile.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "locale updated",
    updatedProfile.locale,
    updateBody.locale,
  );
  // 5. Validate updatedAt was modified (should be after createdAt)
  TestValidator.predicate(
    "updatedAt reflects modification",
    new Date(updatedProfile.updatedAt) > new Date(updatedProfile.createdAt),
  );
}
