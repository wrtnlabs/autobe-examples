import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
export async function authorize_admin_join(connection: api.IConnection, props: {
    body?: DeepPartial<ICommunityPlatformAdmin.IJoin>;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
    const joinInput: ICommunityPlatformAdmin.IJoin = {
        email: props.body?.email ?? (typia.random<string & tags.Format<"email">>()),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        display_name: props.body?.display_name ?? RandomGenerator.name(),
        permissions_level: props.body?.permissions_level ?? null,
    };
    const result = await api.functional.communityPlatform.auth.admin.join(connection, { body: joinInput });
    return result;
}