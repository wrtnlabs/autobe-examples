import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IAvatarImageResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAvatarImageResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_avatar_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create two member users in the same organization context
  // User 1 will be the avatar owner
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Result = await authorize_member_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(user1Result);
  // User 2 will be the requesting user
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Result = await authorize_member_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(user2Result);
  // 2. Execute - Requesting user retrieves target user's avatar
  const avatar: IAvatarImageResponse =
    await api.functional.hrms.member.avatar.get(user2Connection, {
      userId: user1Result.id,
    });
  typia.assert(avatar);
  // 3. Validate - Verify success response
  TestValidator.equals(
    "avatar_uri is returned",
    avatar.avatar_uri !== null,
    true,
  );
  TestValidator.equals("default_avatar is false", avatar.default_avatar, false);
}
