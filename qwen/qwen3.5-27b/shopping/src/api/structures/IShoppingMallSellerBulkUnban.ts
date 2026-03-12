import { tags } from "typia";

import { IShoppingMallSellerBulkUnbanDetail } from "./IShoppingMallSellerBulkUnbanDetail";

export namespace IShoppingMallSellerBulkUnban {
  /**
   * Request body for bulk unban multiple seller accounts operation. This object contains a list of seller IDs that the administrator wants to restore from banned status to active status. All seller IDs must be valid UUIDs, and at least one seller ID must be provided. The operation will attempt to unban each seller in the list, with sellers that are not found or not currently banned being reported as failures in the response.
   */
  export type ICreate = {
    /**
     * List of seller account IDs to restore from banned to active status. Each ID must be a valid UUID corresponding to an existing seller in the system. At least one seller ID must be provided.
     *
     * @x-autobe-specification Array of seller UUIDs to unban. Each seller ID is validated against shopping_mall_sellers table to verify existence and banned status. Backend queries shopping_mall_sellers WHERE id IN (sellerIds) AND status = 'banned', then updates matching records to status = 'active'. Minimum 1 seller ID required. All IDs must be valid UUID format.
     */
    sellerIds: (string & tags.Format<"uuid">)[] & tags.MinItems<1>;
  };

  /**
   * Result object returned after executing a bulk unban operation on multiple seller accounts. Contains summary statistics (total submitted, succeeded, failed) and detailed results for each seller ID processed. Each detail entry indicates whether the unban succeeded or failed, with an optional error reason explaining failures. This allows administrators to understand which sellers were successfully restored to active status and which encountered issues.
   */
  export type IResult = {
    /**
     * Total number of seller IDs submitted for bulk unban operation.
     *
     * @x-autobe-specification Computed as the length of the sellerIds array submitted in the request body. Represents the total number of seller IDs the administrator attempted to unban in this operation.
     */
    total: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of sellers successfully unbanned (status changed from 'banned' to 'active').
     *
     * @x-autobe-specification Computed as the count of sellers successfully updated from 'banned' to 'active' status in the shopping_mall_sellers table. Only sellers that existed and had 'banned' status are counted as succeeded.
     */
    succeeded: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of sellers that failed to unban due to not found, wrong status, or other errors.
     *
     * @x-autobe-specification Computed as the count of sellers that could not be unbanned. Includes sellers not found (invalid ID), sellers not in 'banned' status (already active, pending, rejected, or suspended), or other errors during the update operation.
     */
    failed: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Array of individual unban results for each submitted seller ID, containing success status and optional error reason.
     *
     * @x-autobe-specification Computed as an array of ISellerBulkUnbanDetail objects, one per submitted seller ID. Each detail contains seller_id (the submitted UUID), success (boolean indicating if unban succeeded), and error_reason (nullable string explaining failure if success is false). Array order matches the order of sellerIds in the request.
     */
    details: IShoppingMallSellerBulkUnbanDetail[];
  };
}
