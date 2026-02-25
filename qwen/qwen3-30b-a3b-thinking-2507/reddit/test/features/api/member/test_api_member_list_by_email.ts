import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMember";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_list_by_email(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(7) + '!';
    const username = RandomGenerator.name();
    
    await authorize_member_join(memberConnection, {
        body: {
            email,
            password,
            username,
        }
    });
    
    const domainPart = email.split('@')[1];
    const searchQuery = domainPart.split('.')[0];
    
    const output = await api.functional.reddit.member.members.index(memberConnection, {
        body: {
            search: searchQuery,
            page: 1,
            limit: 10,
        }
    });
    
    typia.assert(output);
    
    const foundUser = output.data.find(user => user.email === email);
    
    TestValidator.equals("Email should be in the list", !!foundUser, true);
}