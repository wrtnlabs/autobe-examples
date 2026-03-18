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

export async function test_api_member_avatar_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member with an existing avatar
  const memberConnection: api.IConnection = { host: connection.host };
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      avatarUrl,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // Verify initial avatar exists
  TestValidator.equals(
    "initial avatarUrl matches input",
    authorized.avatarUrl,
    avatarUrl as string,
  );
  // Remove avatar by setting avatarUrl to null
  const updated =
    await api.functional.erpHrm.member.profile.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          avatarUrl: null,
        } satisfies IErpHrmMember.IAvatarUpload,
      },
    );
  typia.assert(updated);
  // Verify avatar was removed
  TestValidator.equals(
    "avatarUrl should be null after removal",
    updated.avatarUrl,
    null,
  );
}