import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_with_avatar_and_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with complete profile including avatar and phone
  const memberConnection: api.IConnection = { host: connection.host };
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const phoneNumber = RandomGenerator.mobile();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      avatar_image: avatarUrl,
      phone_number: phoneNumber,
    } satisfies Partial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(authorized);
  // 2. Retrieve member profile
  const profile =
    await api.functional.hrmPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate optional fields are correctly stored and returned
  TestValidator.equals("avatar_image matches", profile.avatar_image, avatarUrl);
  TestValidator.equals(
    "phone_number matches",
    profile.phone_number,
    phoneNumber,
  );
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
}
