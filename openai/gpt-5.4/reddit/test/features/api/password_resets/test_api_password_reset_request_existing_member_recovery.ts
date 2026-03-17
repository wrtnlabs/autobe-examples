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
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_request_existing_member_recovery(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "MemberPass1234!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const resetHref = typia.random<string & tags.Format<"uri">>();
  const resetReferrer = typia.random<string & tags.Format<"uri">>();
  const beforeRequest: Date = new Date();
  const reset =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {
        body: {
          email: member.email,
          href: resetHref,
          referrer: resetReferrer,
        },
      },
    );
  typia.assert(reset);
  TestValidator.predicate("reset request id is populated", reset.id.length > 0);
  TestValidator.notEquals(
    "reset request id differs from member id",
    reset.id,
    member.id,
  );
  TestValidator.equals(
    "reset member id matches target member",
    reset.member.id,
    member.id,
  );
  TestValidator.equals(
    "reset member code matches target member",
    reset.member.code,
    member.code,
  );
  TestValidator.equals(
    "reset member email matches target member",
    reset.member.email,
    member.email,
  );
  TestValidator.equals(
    "reset member email verification matches target member",
    reset.member.email_verified,
    member.emailVerified,
  );
  TestValidator.equals(
    "reset member status matches target member",
    reset.member.status,
    member.status,
  );
  TestValidator.equals(
    "reset member last signed in timestamp matches target member",
    reset.member.last_signed_in_at,
    member.lastSignedInAt,
  );
  TestValidator.equals(
    "reset member created timestamp matches target member",
    reset.member.created_at,
    member.createdAt,
  );
  TestValidator.equals(
    "reset member updated timestamp matches target member",
    reset.member.updated_at,
    member.updatedAt,
  );
  TestValidator.equals(
    "reset member deleted timestamp matches target member",
    reset.member.deleted_at,
    member.deletedAt,
  );
  TestValidator.equals("reset href preserved", reset.href, resetHref);
  TestValidator.equals(
    "reset referrer preserved",
    reset.referrer,
    resetReferrer,
  );
  TestValidator.predicate(
    "reset expiration is after request start time",
    new Date(reset.expired_at).getTime() > beforeRequest.getTime(),
  );
  TestValidator.predicate(
    "reset expiration is after reset creation time",
    new Date(reset.expired_at).getTime() > new Date(reset.created_at).getTime(),
  );
  TestValidator.equals("reset used_at is null", reset.used_at, null);
  TestValidator.equals("reset revoked_at is null", reset.revoked_at, null);
  TestValidator.equals("reset deleted_at is null", reset.deleted_at, null);
}
