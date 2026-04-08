import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdmin.IJoin>;
  },
): Promise<IEcommerceMallAdmin.IAuthorized> {
  const joinInput = {
    actorType:
      props.body?.actorType ??
      RandomGenerator.pick(["customer", "seller"] as const),
    requestedGrade:
      props.body?.requestedGrade ??
      RandomGenerator.pick(["admin", "super_admin"] as const),
    reason:
      props.body?.reason ??
      RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  return await api.functional.ecommerceMall.auth.admin.request.join(
    connection,
    {
      body: joinInput,
    },
  );
}
