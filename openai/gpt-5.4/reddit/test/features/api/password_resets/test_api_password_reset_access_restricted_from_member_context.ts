import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_access_restricted_from_member_context(
  connection: api.IConnection,
): Promise<void> {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(memberJoinConnection, {
    body: memberJoinBody,
  });
  typia.assert(joinedMember);
  TestValidator.equals(
    "joined member email matches input",
    joinedMember.email,
    memberEmail,
  );
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const joinedAdmin = await authorize_admin_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  typia.assert(joinedAdmin);
  TestValidator.equals(
    "joined admin email matches input",
    joinedAdmin.email,
    adminJoinBody.email,
  );
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.ILogin;
  const loggedInMember = await authorize_member_login(memberLoginConnection, {
    body: memberLoginBody,
  });
  typia.assert(loggedInMember);
  TestValidator.equals(
    "logged in member email matches registered member",
    loggedInMember.email,
    joinedMember.email,
  );
  const request = {
    member_email: memberEmail,
    page: 1,
    limit: 10,
    sort: "created_at_desc",
  } satisfies ICommunityPlatformMemberPasswordReset.IRequest;
  await TestValidator.httpError(
    "member cannot browse admin password reset history",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.password_resets.index(
        memberLoginConnection,
        {
          body: request,
        },
      );
    },
  );
}
