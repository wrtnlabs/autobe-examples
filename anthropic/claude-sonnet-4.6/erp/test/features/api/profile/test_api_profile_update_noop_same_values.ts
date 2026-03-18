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

export async function test_api_profile_update_noop_same_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain JWT access token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // memberConnection.headers is now updated with the Authorization token
  // 2. First profile update with specific values
  const displayName = RandomGenerator.name();
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const phoneNumber = RandomGenerator.mobile();
  const firstUpdateBody = {
    displayName,
    avatarUrl,
    phoneNumber,
  } satisfies IErpHrmGuestSession.IUpdate;
  const firstResult = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: firstUpdateBody,
    },
  );
  typia.assert(firstResult);
  // 3. No-op update: submit exactly the same values as first update
  const noopBody = {
    displayName,
    avatarUrl,
    phoneNumber,
  } satisfies IErpHrmGuestSession.IUpdate;
  const noopResult = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: noopBody,
    },
  );
  typia.assert(noopResult);
  // 4. Assert that the no-op returns valid data with same identifier
  // The session ID should remain the same (same profile/session record)
  TestValidator.equals(
    "no-op update returns same session id",
    noopResult.id,
    firstResult.id,
  );
  // Assert the guest information is unchanged
  TestValidator.equals(
    "no-op update returns same guest id",
    noopResult.guest.id,
    firstResult.guest.id,
  );
}
