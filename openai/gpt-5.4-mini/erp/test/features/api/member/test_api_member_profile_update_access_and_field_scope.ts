import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_access_and_field_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://example.com/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const originalProfile = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(originalProfile);
  TestValidator.equals(
    "initial profile id matches authorization snapshot",
    originalProfile.id,
    authorized.id,
  );
  TestValidator.equals(
    "initial profile email matches authorization snapshot",
    originalProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "initial profile display name matches authorization snapshot",
    originalProfile.displayName,
    authorized.displayName,
  );
  TestValidator.equals(
    "initial profile avatar matches authorization snapshot",
    originalProfile.avatarImageUrl,
    authorized.avatarImageUrl,
  );
  TestValidator.equals(
    "initial profile phone matches authorization snapshot",
    originalProfile.phoneNumber,
    authorized.phoneNumber,
  );
  TestValidator.equals(
    "initial profile createdAt matches authorization snapshot",
    originalProfile.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "initial profile updatedAt matches authorization snapshot",
    originalProfile.updatedAt,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "initial profile deletedAt matches authorization snapshot",
    originalProfile.deletedAt,
    authorized.deletedAt,
  );
  const firstUpdateBody = {
    displayName: RandomGenerator.name(),
    avatarImageUrl: `https://example.com/avatar/${RandomGenerator.alphabets(8)}.png`,
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IErpHrmTimeMember.IUpdate;
  const updated = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: firstUpdateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("member id preserved", updated.id, authorized.id);
  TestValidator.equals(
    "member email preserved",
    updated.email,
    authorized.email,
  );
  TestValidator.equals(
    "createdAt preserved",
    updated.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "deletedAt preserved",
    updated.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "displayName updated",
    updated.displayName,
    firstUpdateBody.displayName,
  );
  TestValidator.equals(
    "avatarImageUrl updated",
    updated.avatarImageUrl,
    firstUpdateBody.avatarImageUrl,
  );
  TestValidator.equals(
    "phoneNumber updated",
    updated.phoneNumber,
    firstUpdateBody.phoneNumber,
  );
  TestValidator.equals(
    "updated profile remains same account",
    updated.id,
    originalProfile.id,
  );
  const secondUpdateBody = {
    displayName: RandomGenerator.name(),
    avatarImageUrl: null,
    phoneNumber: null,
  } satisfies IErpHrmTimeMember.IUpdate;
  const updatedAgain = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: secondUpdateBody,
    },
  );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "member id preserved after second update",
    updatedAgain.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email preserved after second update",
    updatedAgain.email,
    authorized.email,
  );
  TestValidator.equals(
    "displayName updated again",
    updatedAgain.displayName,
    secondUpdateBody.displayName,
  );
  TestValidator.equals(
    "avatarImageUrl cleared",
    updatedAgain.avatarImageUrl,
    null,
  );
  TestValidator.equals("phoneNumber cleared", updatedAgain.phoneNumber, null);
  TestValidator.equals(
    "createdAt preserved after second update",
    updatedAgain.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "deletedAt preserved after second update",
    updatedAgain.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "authorization snapshot remains unchanged",
    authorized.displayName,
    originalProfile.displayName,
  );
}
