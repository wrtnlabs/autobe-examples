import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardProfile";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_profile_own_view(connection: api.IConnection): Promise<void> {
    // Step 1: Create connection and authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, { body: {} });
    typia.assert(member);
    // Step 2: Create article to establish profile presence with activity metrics
    const article = await generate_random_econ_politic_board_member_articles_create(memberConnection, {
        body: {}
    });
    typia.assert(article);
    // Step 3: Retrieve the member's profile
    const profile = await api.functional.econPoliticBoard.member.profiles.at(memberConnection, {
        profileId: member.id
    });
    typia.assert(profile);
    // Step 4: Validate profile matches member data
    TestValidator.equals("profile id matches member id", profile.id, member.id);
    TestValidator.equals("profile display name matches member name", profile.display_name, member.display_name);
    TestValidator.equals("profile bio matches member bio", profile.bio, member.bio);
    TestValidator.equals("profile article count matches member article count", profile.article_count, member.article_count);
    TestValidator.equals("profile comment count matches member comment count", profile.comment_count, member.comment_count);
}