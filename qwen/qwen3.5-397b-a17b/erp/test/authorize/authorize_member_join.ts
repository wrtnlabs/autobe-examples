import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformMember.IJoin>;
  },
): Promise<IHrmPlatformMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    avatar_url:
      props.body?.avatar_url ??
      typia.random<(string & tags.Format<"uri">) | null>(),
    phone_number: props.body?.phone_number ?? RandomGenerator.mobile(),
    ip: props.body?.ip ?? typia.random<(string & tags.Format<"ipv4">) | null>(),
  } satisfies IHrmPlatformMember.IJoin;
  return await api.functional.hrmPlatform.auth.member.join(connection, {
    body: joinInput,
  });
}
