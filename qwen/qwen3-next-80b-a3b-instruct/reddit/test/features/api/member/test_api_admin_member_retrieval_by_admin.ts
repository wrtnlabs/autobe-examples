import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_member_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Verify admin authentication was successful
  typia.assert(adminAuth);
  // Generate random member ID for requested member
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  // Retrieve member profile as admin
  const member: ICommunityPlatformMember =
    await api.functional.communityPlatform.admin.members.at(adminConnection, {
      memberId: memberId,
    });
  // Perform comprehensive type validation
  typia.assert(member);
  // Validate basic fields
  TestValidator.equals(
    "returned member ID matches requested ID",
    member.id,
    memberId,
  );
  TestValidator.predicate(
    "username has valid length",
    member.username.length >= 3 && member.username.length <= 50,
  );
  TestValidator.predicate(
    "display name has valid length",
    member.display_name.length >= 1 && member.display_name.length <= 100,
  );
  TestValidator.predicate("bio has valid length", member.bio.length <= 500);
  TestValidator.predicate(
    "avatar URL is valid URI",
    /^(https?:\/\/.+)/.test(member.avatar_url),
  );
  TestValidator.predicate(
    "karma score is non-negative 32-bit integer",
    member.karma_score >= 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time format",
    !isNaN(Date.parse(member.createdAt)),
  );
  // Validate that all properties from ICommunityPlatformMember are present
  // According to the schema definition, the response includes these:
  TestValidator.equals(
    "email is a valid email format",
    Boolean(member.email.match(/^[^@]+@[^@]+\.[^@]+$/)),
    true,
  );
  TestValidator.equals(
    "verified is a boolean",
    typeof member.verified === "boolean",
    true,
  );
  TestValidator.equals(
    "role is one of allowed values",
    ["user", "moderator", "admin"].includes(member.role),
    true,
  );
  // Validate language preference is one of the allowed values
  const allowedLanguages: Array<
    | "en-US"
    | "es-ES"
    | "fr-FR"
    | "de-DE"
    | "ja-JP"
    | "zh-CN"
    | "pt-BR"
    | "ru-RU"
    | "it-IT"
    | "ko-KR"
  > = [
    "en-US",
    "es-ES",
    "fr-FR",
    "de-DE",
    "ja-JP",
    "zh-CN",
    "pt-BR",
    "ru-RU",
    "it-IT",
    "ko-KR",
  ];
  TestValidator.equals(
    "language preference is valid",
    allowedLanguages.includes(member.language_preference),
    true,
  );
  // Ensure karma is a 32-bit integer
  TestValidator.predicate(
    "karma is 32-bit integer",
    Number.isInteger(member.karma_score) &&
      member.karma_score >= -(2 ** 31) &&
      member.karma_score <= 2 ** 31 - 1,
  );
}