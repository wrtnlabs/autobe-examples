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

export async function test_api_member_profile_update_across_organization_contexts(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const secondConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const password = `${RandomGenerator.alphaNumeric(12)}Aa1!`;
  const originalDisplayName = RandomGenerator.name();
  const firstUpdatedDisplayName = RandomGenerator.name();
  const secondUpdatedDisplayName = RandomGenerator.name();
  const avatarImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`;
  const phoneNumber = RandomGenerator.mobile();
  const authorized = await authorize_member_join(firstConnection, {
    body: {
      email,
      password,
      displayName: originalDisplayName,
      avatarImageUrl,
      phoneNumber,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  secondConnection.headers = {
    ...firstConnection.headers,
  };
  const updatedFromFirstContext =
    await api.functional.erpHrmTime.member.profile.update(firstConnection, {
      body: {
        displayName: firstUpdatedDisplayName,
        avatarImageUrl,
        phoneNumber,
      } satisfies IErpHrmTimeMember.IUpdate,
    });
  typia.assert(updatedFromFirstContext);
  TestValidator.equals(
    "first context preserves member identity",
    updatedFromFirstContext.id,
    authorized.id,
  );
  TestValidator.equals(
    "first context preserves member email",
    updatedFromFirstContext.email,
    authorized.email,
  );
  TestValidator.equals(
    "first context updates shared display name",
    updatedFromFirstContext.displayName,
    firstUpdatedDisplayName,
  );
  TestValidator.equals(
    "first context updates shared avatar image url",
    updatedFromFirstContext.avatarImageUrl,
    avatarImageUrl,
  );
  TestValidator.equals(
    "first context updates shared phone number",
    updatedFromFirstContext.phoneNumber,
    phoneNumber,
  );
  const updatedFromSecondContext =
    await api.functional.erpHrmTime.member.profile.update(secondConnection, {
      body: {
        displayName: secondUpdatedDisplayName,
        avatarImageUrl: null,
        phoneNumber: null,
      } satisfies IErpHrmTimeMember.IUpdate,
    });
  typia.assert(updatedFromSecondContext);
  TestValidator.equals(
    "second context preserves same member identity",
    updatedFromSecondContext.id,
    authorized.id,
  );
  TestValidator.equals(
    "second context preserves same member email",
    updatedFromSecondContext.email,
    authorized.email,
  );
  TestValidator.equals(
    "second context updates the same shared profile",
    updatedFromSecondContext.displayName,
    secondUpdatedDisplayName,
  );
  TestValidator.equals(
    "second context clears avatar image url",
    updatedFromSecondContext.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "second context clears phone number",
    updatedFromSecondContext.phoneNumber,
    null,
  );
  TestValidator.notEquals(
    "shared display name changes between sequential updates",
    updatedFromFirstContext.displayName,
    updatedFromSecondContext.displayName,
  );
  TestValidator.equals(
    "creation timestamp remains stable across updates",
    updatedFromSecondContext.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "member account remains active",
    updatedFromSecondContext.deletedAt,
    null,
  );
}
