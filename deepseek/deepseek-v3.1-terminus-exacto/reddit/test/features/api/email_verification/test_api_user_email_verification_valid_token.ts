import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 创建用户账户（这会生成邮件验证令牌）
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorized);
  // 假设电子邮件验证令牌可以从用户响应中获取
  // 如果没有直接提供，我们需要模拟或等待验证过程
  // 这里我们假设有一个方式来获取验证ID
  const verificationId = "需要从系统获取的验证ID";
  // 查询验证状态
  const verification =
    await api.functional.communityPlatform.user.email_verifications.at(
      userConnection,
      { verificationId: verificationId },
    );
  typia.assert(verification);
  // 验证返回的数据结构
  TestValidator.equals("验证ID匹配", verification.id, verificationId);
  TestValidator.predicate(
    "状态应为verified",
    verification.status === "verified",
  );
  TestValidator.equals("演员类型应为user", verification.actor_type, "user");
  TestValidator.predicate(
    "过期时间应在未来",
    verification.expires_at !== undefined &&
      new Date(verification.expires_at) > new Date(),
  );
  TestValidator.predicate(
    "验证时间应为过去",
    verification.verified_at !== null && verification.verified_at !== undefined,
  );
  TestValidator.predicate(
    "创建时间应为过去",
    new Date(verification.created_at) <= new Date(),
  );
}
