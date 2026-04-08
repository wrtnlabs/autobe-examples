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

export async function test_api_member_profile_update_display_name_and_phone(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store original timestamps for comparison
  const originalUpdatedAt = authorized.updated_at;
  // 2. Prepare updated profile data
  const newDisplayName = RandomGenerator.name(2);
  const newPhone = RandomGenerator.mobile();
  // 3. Update member profile with display_name and phone
  const updatedMember = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        phone: newPhone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 4. Validate updated member record
  TestValidator.equals(
    "display_name updated correctly",
    updatedMember.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone updated correctly",
    updatedMember.phone,
    newPhone,
  );
  TestValidator.equals(
    "email unchanged",
    updatedMember.email,
    authorized.email,
  );
  // 5. Validate updated_at timestamp is updated
  TestValidator.predicate(
    "updated_at is after original timestamp",
    updatedMember.updated_at > originalUpdatedAt,
  );
}
