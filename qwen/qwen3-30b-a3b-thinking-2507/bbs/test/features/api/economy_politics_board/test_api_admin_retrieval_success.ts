import api from '@ORGANIZATION/PROJECT-api';
import type { IAuthorizationToken } from '@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken';
import type { IEconomyPoliticsBoardAdmin } from '@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin';
import type { IEconomyPoliticsBoardAdministratorRequest } from '@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest';
import type { IEconomyPoliticsBoardUser } from '@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser';
import { IEntity } from '@ORGANIZATION/PROJECT-api/lib/structures/IEntity';
import { DeepPartial } from '@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial';
import { ArrayUtil, RandomGenerator, TestValidator } from '@nestia/e2e';
import { IConnection } from '@nestia/fetcher';
import { randint } from 'tstl';
import typia, { tags } from 'typia';

import { authorize_user_join } from '../../../authorize/authorize_user_join';
import { authorize_user_login } from '../../../authorize/authorize_user_login';
import { authorize_user_refresh } from '../../../authorize/authorize_user_refresh';
import { generate_random_economy_politics_board_user_administrator_requests_create } from '../../../generate/generate_random_economy_politics_board_user_administrator_requests_create';
import { prepare_random_economy_politics_board_administrator_request } from '../../../prepare/prepare_random_economy_politics_board_administrator_request';

export async function test_api_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User setup
  const userConnection: api.IConnection = { host: connection.host };
  // Create user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<'email'>>(),
      password: 'userpassword123',
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Submit administrator request
  const request = await generate_random_economy_politics_board_user_administrator_requests_create(
    userConnection,
    {
      body: {
        reason: 'I want to be an administrator of this content management system. I have experience managing multiple teams and content streams.',
      } satisfies IEconomyPoliticsBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request);
  // 3. Retrieve admin account
  const admin = await api.functional.economyPoliticsBoard.admins.at(
    connection,
    { adminId: request.requestor.id },
  );
  typia.assert(admin);
  // 4. Validate
  TestValidator.equals('Active admin account', admin.deleted_at, null);
  TestValidator.equals(
    'Admin ID matches requestor ID',
    admin.id,
    request.requestor.id,
  );
  TestValidator.equals('Email matches', admin.email, user.email);
}