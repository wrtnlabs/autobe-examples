import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
export async function authorize_guest_refresh(connection: api.IConnection, props: {
    body?: DeepPartial<IDiscussionBoardMember.IRefresh>;
}): Promise<IDiscussionBoardMember.IAuthorized> {
    const refreshInput: IDiscussionBoardMember.IRefresh = {
        refreshToken: props.body?.refreshToken ?? RandomGenerator.alphaNumeric(32),
        href: props.body?.href ?? "https://example.com",
        referrer: props.body?.referrer ?? "https://example.com",
        ip: props.body?.ip ?? RandomGenerator.mobile(),
    };
    return await api.functional.auth.guest.refresh(connection, { body: refreshInput });
}