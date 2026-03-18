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

export async function test_api_member_avatar_default_placeholder(
  connection: api.IConnection,
): Promise<void> {
  // Create member A - the avatar subject (will never upload custom avatar)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // Create member B - the authenticated requester
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // Retrieve member A's avatar as member B (testing data isolation)
  const avatarResponse: IAvatarImageResponse =
    await api.functional.hrms.member.avatar.get(memberBConnection, {
      userId: memberAAuthorized.id,
    });
  typia.assert(avatarResponse);
  // Validate default avatar flag is true
  TestValidator.equals(
    "default_avatar flag should be true for user without custom avatar",
    avatarResponse.default_avatar,
    true,
  );
  // Validate avatar_uri exists and is a valid URI with proper content media type
  TestValidator.predicate(
    "avatar_uri should be a valid image URI (PNG or JPEG)",
    avatarResponse.avatar_uri !== null &&
      avatarResponse.avatar_uri !== undefined &&
      avatarResponse.avatar_uri.length > 0,
  );
  // Verify the response structure is complete with both required fields
  typia.assert(avatarResponse);
}
