import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create account with initial profile
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.member);
  // Capture original profile data before update
  const originalDisplay = memberAuth.member.display_name;
  const originalAvatar = memberAuth.member.avatar_uri;
  const originalPhone = memberAuth.member.phone_number;
  const originalUpdated = memberAuth.member.updated_at;
  const originalEmail = memberAuth.email;
  const originalId = memberAuth.member.id;
  // 2. Prepare profile update data with all three fields
  const display_name = RandomGenerator.name();
  const avatar_uri = typia.random<string & tags.Format<"uri">>() as string | null | undefined;
  const phone_number = RandomGenerator.mobile();
  const updateBody = {
    display_name,
    avatar_uri,
    phone_number,
  } satisfies IHrmPlatformMember.IUpdate;
  // 3. Execute profile update request
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate response contains updated values
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    display_name,
  );
  TestValidator.equals(
    "avatar_uri updated",
    updatedProfile.avatar_uri,
    avatar_uri,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    phone_number,
  );
  // 5. Validate account metadata unchanged
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    originalEmail,
  );
  TestValidator.equals("id unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "is_active unchanged",
    updatedProfile.is_active,
    true,
  );
  // 6. Validate updated_at timestamp changed to reflect the update operation
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdated,
    updatedProfile.updated_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () =>
      typeof updatedProfile.updated_at === "string" &&
      !Number.isNaN(Date.parse(updatedProfile.updated_at)),
  );
}