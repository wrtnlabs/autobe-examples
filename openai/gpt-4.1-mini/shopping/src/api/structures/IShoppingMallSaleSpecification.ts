import { tags } from "typia";

import { IShoppingMallSale } from "./IShoppingMallSale";

export namespace IShoppingMallSaleSpecification {
  /**
   * Parameters for filtering and paginating shopping mall sale specifications in analytics queries.
   */
  export type IRequest = {
    /**
     * Optional filter by technical specification key.
     *
     * @x-autobe-specification Optional string filter parameter for searching the specification_key column in shopping_mall_sale_specifications table.
     */
    specificationKey?: string | null | undefined;

    /**
     * Optional filter by specification value.
     *
     * @x-autobe-specification Optional string filter parameter for searching the specification_value column in shopping_mall_sale_specifications table.
     */
    specificationValue?: string | null | undefined;

    /**
     * Page number starting from 1 for paginated results.
     *
     * @x-autobe-specification Page number (1-based) for paginated retrieval of sale specifications.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum items per page for pagination, maximum 100.
     *
     * @x-autobe-specification Maximum number of items to return per page for pagination, capped at 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary of a technical product specification linked to a sale within the shopping mall platform. Contains key-value pairs describing specification attributes and their values.
   */
  export type ISummary = {
    /**
     * Unique identifier of the technical product specification.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.id column, primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Key name for the technical specification attribute, e.g., 'Weight', 'Material', 'Battery Life'.
     *
     * @x-autobe-database-schema-property specification_key
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.specification_key column, representing the specification attribute name.
     */
    specificationKey: string;

    /**
     * Value corresponding to the specification key describing the technical detail.
     *
     * @x-autobe-database-schema-property specification_value
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.specification_value column, containing the value for the specification attribute.
     */
    specificationValue: string;

    /**
     * Timestamp when the specification record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.created_at column, storing creation timestamp with timezone.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the specification record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.updated_at column, storing last updated timestamp with timezone.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating soft deletion status, null if not deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from shopping_mall_sale_specifications.deleted_at column, storing deletion timestamp for soft deletion, nullable.
     */
    deletedAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Reference to the sale listing this specification belongs to.
     *
     * @x-autobe-database-schema-property shoppingMallSale
     * @x-autobe-specification Join relation via shopping_mall_sale_id foreign key linking to shopping_mall_sales.id, represented as IShoppingMallSale.ISummary DTO reference.
     */
    shoppingMallSale: IShoppingMallSale.ISummary;
  };
}
