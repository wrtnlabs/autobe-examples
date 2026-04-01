import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_member_shared_global_profile_account_field_protection(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/join/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const displayName = RandomGenerator.name();
  const avatarImageUrl = `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`;
  const phoneNumber = RandomGenerator.mobile();
  const updated = await api.functional.erpHrmTime.guest.profile.update(
    memberConnection,
    {
      body: {
        displayName,
        avatarImageUrl,
        phoneNumber,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "display name updated",
    updated.displayName,
    displayName,
  );
  TestValidator.equals(
    "avatar image url updated",
    updated.avatarImageUrl,
    avatarImageUrl,
  );
  TestValidator.equals(
    "phone number updated",
    updated.phoneNumber,
    phoneNumber,
  );
  TestValidator.predicate("member id is populated", updated.id.length > 0);
  TestValidator.predicate(
    "member email is populated",
    updated.email.length > 0,
  );
  TestValidator.predicate(
    "createdAt is populated",
    updated.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is populated",
    updated.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null or timestamp",
    updated.deletedAt === null || updated.deletedAt.length > 0,
  );
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated profile update should fail",
    async () => {
      await api.functional.erpHrmTime.guest.profile.update(
        unauthenticatedConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
          } satisfies IErpHrmTimeMember.IUpdate,
        },
      );
    },
  );
}
