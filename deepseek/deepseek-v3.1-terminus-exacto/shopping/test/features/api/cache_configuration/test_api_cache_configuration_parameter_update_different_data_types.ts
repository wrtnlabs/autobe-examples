import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCacheConfigurationParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameter";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_cache_configuration_parameter_update_different_data_types(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    
    // Create valid join data
    const joinData: IEcommerceSuperAdministrator.IJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>()
    };
    
    await authorize_super_administrator_join(superAdminConnection, {
        body: joinData
    });
    
    const configId = typia.random<string & tags.Format<"uuid">>();
    const parameterId = typia.random<string & tags.Format<"uuid">>();
    
    // Test string parameter
    const stringValue = RandomGenerator.alphabets(10);
    const stringParam = await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(superAdminConnection, {
        configId,
        parameterId,
        body: {
            parameterValue: stringValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
    });
    typia.assert(stringParam);
    TestValidator.equals("string parameter value", stringParam.parameter_value, stringValue);
    
    // Test integer parameter
    const integerValue = typia.random<number & tags.Type<"int32">>().toString();
    const integerParam = await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(superAdminConnection, {
        configId,
        parameterId,
        body: {
            parameterValue: integerValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
    });
    typia.assert(integerParam);
    TestValidator.equals("integer parameter value", integerParam.parameter_value, integerValue);
    
    // Test boolean parameter
    const booleanValue = "true";
    const booleanParam = await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(superAdminConnection, {
        configId,
        parameterId,
        body: {
            parameterValue: booleanValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
    });
    typia.assert(booleanParam);
    TestValidator.equals("boolean parameter value", booleanParam.parameter_value, booleanValue);
    
    // Test array parameter (JSON string)
    const arrayValue = JSON.stringify(["item1", "item2", "item3"]);
    const arrayParam = await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(superAdminConnection, {
        configId,
        parameterId,
        body: {
            parameterValue: arrayValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
    });
    typia.assert(arrayParam);
    TestValidator.equals("array parameter value", arrayParam.parameter_value, arrayValue);
    
    // Test object parameter (JSON string)
    const objectValue = JSON.stringify({ key: "value", number: 123, active: true });
    const objectParam = await api.functional.ecommerce.superAdministrator.cache_configurations.parameters.update(superAdminConnection, {
        configId,
        parameterId,
        body: {
            parameterValue: objectValue,
        } satisfies IEcommerceCacheConfigurationParameter.IUpdate,
    });
    typia.assert(objectParam);
    TestValidator.equals("object parameter value", objectParam.parameter_value, objectValue);
}