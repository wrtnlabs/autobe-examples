import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: ICommunityPlatformAdmin.IJoin;
  },
): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    href: props.body.href ?? "https://example.com/join",
    referrer: props.body.referrer ?? "https://example.com",
    ip: props.body.ip ?? null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  return await api.functional.auth.admin.join(connection, { body: joinInput });
}
