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

export async function test_api_member_avatar_replace_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(authorized);
  // 2. Upload initial avatar
  const initialAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const initialResult =
    await api.functional.erpHrm.member.profile.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          avatarUrl: initialAvatarUrl,
        } satisfies IErpHrmMember.IAvatarUpload,
      },
    );
  typia.assert(initialResult);
  TestValidator.equals(
    "initial avatarUrl set correctly",
    initialResult.avatarUrl,
    initialAvatarUrl,
  );
  // 3. Replace avatar with new URL
  const newAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const replacedResult =
    await api.functional.erpHrm.member.profile.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          avatarUrl: newAvatarUrl,
        } satisfies IErpHrmMember.IAvatarUpload,
      },
    );
  typia.assert(replacedResult);
  // 4. Validate replacement occurred
  TestValidator.equals(
    "replaced avatarUrl matches new value",
    replacedResult.avatarUrl,
    newAvatarUrl,
  );
  TestValidator.notEquals(
    "avatarUrl changed after replacement",
    initialResult.avatarUrl,
    replacedResult.avatarUrl,
  );
}
