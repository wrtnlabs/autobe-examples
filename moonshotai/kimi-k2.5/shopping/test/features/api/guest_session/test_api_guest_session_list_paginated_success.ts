import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Super administrator retrieves a paginated list of guest authentication sessions
 * with no filters applied. This is the primary success path for monitoring guest
 * access patterns.
 *
 * The test verifies that the super admin can successfully authenticate, submit
 * an empty request body with minimal pagination params, and receive a paginated
 * response containing guest session summaries with their connection metadata
 * (IP, href, referrer), creation timestamp, and expiration timestamp. Each
 * session includes the associated guest account reference with its status
 * (active/expired) computed from the most recent session expiration.
 */
export async function test_api_guest_session_list_paginated_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {},
  });
  // 2. Retrieve paginated list of guest sessions with default params
  const response =
    await api.functional.ecommerceMall.superAdmin.guest_sessions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallGuestSession.IRequest,
      },
    );
  // 3. Validate complete response structure
  typia.assert(response);
}
