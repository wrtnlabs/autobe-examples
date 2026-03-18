import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain JWT access token
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Prepare profile update body with all editable fields
  const updateBody = {
    displayName: "Jane Doe",
    avatarUrl: "https://cdn.example.com/avatar/jane.png" as string &
      tags.Format<"uri">,
    phoneNumber: "+1-555-0100",
  } satisfies IErpHrmGuestSession.IUpdate;
  // 3. Call PUT /erpHrm/member/profile with the member's authenticated connection
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  // 4. Validate the response type
  typia.assert(updatedProfile);
}
