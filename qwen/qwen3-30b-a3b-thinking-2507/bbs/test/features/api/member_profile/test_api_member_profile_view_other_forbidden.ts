import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { prepare_random_econ_politic_board_section } from "../../../prepare/prepare_random_econ_politic_board_section";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { generate_random_econ_politic_board_member_articles_create } from "../../../generate/generate_random_econ_politic_board_member_articles_create";
import { generate_random_econ_politic_board_admin_sections_create } from "../../../generate/generate_random_econ_politic_board_admin_sections_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_profile_view_other_forbidden(connection: api.IConnection): Promise<void> {
    // 1. Create admin account
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
        }
    });
    typia.assert(admin);
    
    // 2. Create section required for article creation
    const section = await generate_random_econ_politic_board_admin_sections_create(adminConnection, {
        body: {
        }
    });
    typia.assert(section);
    
    // 3. Create profile-owning member account
    const profileOwnerConnection: api.IConnection = { host: connection.host };
    const profileOwner = await authorize_member_join(profileOwnerConnection, {
        body: {
        }
    });
    typia.assert(profileOwner);
    
    // 4. Create article to establish profile (must include section id)
    const profileArticle = await generate_random_econ_politic_board_member_articles_create(profileOwnerConnection, {
        body: {
            sectionId: section.id,
        }
    });
    typia.assert(profileArticle);
    
    // 5. Create viewer member account
    const viewerConnection: api.IConnection = { host: connection.host };
    const viewer = await authorize_member_join(viewerConnection, {
        body: {
        }
    });
    typia.assert(viewer);
    
    // 6. Viewer attempts to view profile owned by profileOwner - should fail with 403
    await TestValidator.error("standard member cannot view other member's profile", async () => {
        await api.functional.econPoliticBoard.members.at(viewerConnection, {
            memberId: profileOwner.id,
        });
    });
}